package com.daliantutor;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@MapperScan("com.daliantutor.mapper")
public class DalianTutorApplication {

    public static void main(String[] args) {
        SpringApplication.run(DalianTutorApplication.class, args);
    }
}
